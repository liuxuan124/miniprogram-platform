from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
import pdfplumber


SOURCE_DIR = Path(r"D:\Appdate\google download")
OUTPUT_DIR = Path(r"D:\项目管理\小程序搭建与管理系统\output\credit_card_bills")
PDF_NAMES = [
    "2025年06月信用卡账单.pdf",
    "2025年07月信用卡账单.pdf",
    "2025年08月信用卡账单.pdf",
    "2025年09月信用卡账单.pdf",
    "2025年10月信用卡账单.pdf",
    "2025年11月信用卡账单.pdf",
    "2025年12月信用卡账单.pdf",
    "2026年01月信用卡账单.pdf",
    "2026年02月信用卡账单.pdf",
    "2026年03月信用卡账单.pdf",
    "2026年04月信用卡账单.pdf",
]

CATEGORIES = {"还款", "分期", "预借现金", "费用", "利息", "退款", "消费"}
ROW_RE = re.compile(
    r"^(?P<trade>\d{2}/\d{2})"
    r"(?:\s+(?P<post>\d{2}/\d{2}))?\s+"
    r"(?P<desc>.+?)\s+"
    r"(?P<amount>-?\d[\d,]*\.\d{2})\s+"
    r"(?P<card>\d{4})\s+"
    r"(?P<orig>.+)$"
)
MONEY_RE = re.compile(r"¥\s*([-]?\d[\d,]*\.\d{2})")
MONTH_RE = re.compile(r"(?P<year>\d{4})年(?P<month>\d{2})月")


def money_to_float(value: str | None) -> float | None:
    if value is None:
        return None
    return float(value.replace(",", ""))


def parse_month(pdf_name: str) -> tuple[int, int, str]:
    match = MONTH_RE.search(pdf_name)
    if not match:
        raise ValueError(f"Cannot parse month from {pdf_name}")
    year = int(match.group("year"))
    month = int(match.group("month"))
    return year, month, f"{year}-{month:02d}"


def date_from_mmdd(mmdd: str | None, bill_year: int, bill_month: int) -> str | None:
    if not mmdd:
        return None
    month, day = [int(part) for part in mmdd.split("/")]
    year = bill_year - 1 if month > bill_month else bill_year
    return f"{year}-{month:02d}-{day:02d}"


def extract_text(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def parse_summary(text: str, bill_month: str) -> dict[str, object]:
    statement_date = None
    due_date = None
    credit_limit = None
    new_balance = None
    min_payment = None
    formula_values: list[float] = []

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        if "账单日 信用额度" in line and index + 1 < len(lines):
            date_match = re.search(r"\d{4}年\d{2}月\d{2}日", lines[index + 1])
            money_match = MONEY_RE.search(lines[index + 1])
            statement_date = date_match.group(0) if date_match else statement_date
            credit_limit = money_to_float(money_match.group(1)) if money_match else credit_limit
        elif line == "到期还款日" and index + 1 < len(lines):
            due_date = lines[index + 1]
        elif line == "本期应还金额" and index + 1 < len(lines):
            match = MONEY_RE.search(lines[index + 1])
            new_balance = money_to_float(match.group(1)) if match else new_balance
        elif line == "本期最低还款额" and index + 1 < len(lines):
            match = MONEY_RE.search(lines[index + 1])
            min_payment = money_to_float(match.group(1)) if match else min_payment
        elif line.startswith("¥ ") and line.count("¥") >= 5:
            formula_values = [money_to_float(v) for v in MONEY_RE.findall(line)]

    summary = {
        "账单月份": bill_month,
        "账单日": statement_date,
        "到期还款日": due_date,
        "信用额度": credit_limit,
        "本期应还金额": new_balance,
        "本期最低还款额": min_payment,
    }
    if len(formula_values) >= 6:
        summary.update(
            {
                "公式_本期应还金额": formula_values[0],
                "公式_上期账单金额": formula_values[1],
                "公式_上期还款金额": formula_values[2],
                "公式_本期账单金额": formula_values[3],
                "公式_本期调整金额": formula_values[4],
                "公式_循环利息": formula_values[5],
            }
        )
    return summary


def parse_transactions(text: str, pdf_name: str, bill_year: int, bill_month: int, bill_label: str) -> list[dict[str, object]]:
    current_category = None
    rows: list[dict[str, object]] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line in CATEGORIES:
            current_category = line
            continue
        if current_category is None:
            continue

        match = ROW_RE.match(line)
        if not match:
            continue

        rows.append(
            {
                "账单月份": bill_label,
                "来源文件": pdf_name,
                "分类": current_category,
                "交易日": date_from_mmdd(match.group("trade"), bill_year, bill_month),
                "记账日": date_from_mmdd(match.group("post"), bill_year, bill_month),
                "交易摘要": match.group("desc").strip(),
                "人民币金额": money_to_float(match.group("amount")),
                "卡号末四位": match.group("card"),
                "交易地金额": match.group("orig").strip(),
            }
        )
    return rows


def classify_merchant(desc: str) -> str:
    prefixes = [
        "财付通",
        "京东支付",
        "支付宝",
        "GOOGLE",
        "CURSOR",
        "美团",
        "抖音支付",
        "手机银行还款",
        "预约还款",
    ]
    for prefix in prefixes:
        if desc.startswith(prefix):
            return prefix
    return desc.split("-")[0].split("（")[0].strip()


def build_report(summary_df: pd.DataFrame, tx_df: pd.DataFrame, category_pivot: pd.DataFrame, top_merchants: pd.DataFrame) -> str:
    total_new_balance = summary_df["本期应还金额"].sum()
    total_payment = tx_df.loc[tx_df["分类"] == "还款", "人民币金额"].sum()
    total_spend = tx_df.loc[tx_df["分类"] == "消费", "人民币金额"].sum()
    total_refund = tx_df.loc[tx_df["分类"] == "退款", "人民币金额"].sum()
    total_interest = tx_df.loc[tx_df["分类"] == "利息", "人民币金额"].sum()
    max_month = summary_df.loc[summary_df["本期应还金额"].idxmax()]
    min_month = summary_df.loc[summary_df["本期应还金额"].idxmin()]

    def markdown_table(df: pd.DataFrame) -> str:
        formatted = df.copy()
        for column in formatted.columns:
            if pd.api.types.is_numeric_dtype(formatted[column]):
                if "笔数" in str(column):
                    formatted[column] = formatted[column].map(lambda value: f"{value:,.0f}")
                else:
                    formatted[column] = formatted[column].map(lambda value: f"{value:,.2f}")
            else:
                formatted[column] = formatted[column].fillna("").astype(str)
        headers = list(formatted.columns)
        lines = [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * len(headers)) + " |",
        ]
        for _, row in formatted.iterrows():
            lines.append("| " + " | ".join(str(row[col]) for col in headers) + " |")
        return "\n".join(lines)

    lines = [
        "# 信用卡账单整理汇总",
        "",
        f"- 覆盖月份: {summary_df['账单月份'].min()} 至 {summary_df['账单月份'].max()}",
        f"- 账单份数: {len(summary_df)}",
        f"- 明细笔数: {len(tx_df)}",
        f"- 11期本期应还金额合计: {total_new_balance:,.2f}",
        f"- 明细消费合计: {total_spend:,.2f}",
        f"- 明细还款合计: {total_payment:,.2f}",
        f"- 明细退款合计: {total_refund:,.2f}",
        f"- 循环利息合计: {total_interest:,.2f}",
        f"- 最高应还月份: {max_month['账单月份']} / {max_month['本期应还金额']:,.2f}",
        f"- 最低应还月份: {min_month['账单月份']} / {min_month['本期应还金额']:,.2f}",
        "",
        "## 月度账单",
        "",
        markdown_table(summary_df[["账单月份", "账单日", "到期还款日", "信用额度", "本期应还金额", "本期最低还款额"]]),
        "",
        "## 分类汇总",
        "",
        markdown_table(category_pivot),
        "",
        "## 商户/来源 Top 20",
        "",
        markdown_table(top_merchants.head(20)),
        "",
        "## 注意",
        "",
        "- 金额为负数通常表示还款或退款。",
        "- Excel 文件包含完整交易明细，可继续筛选、排序、透视。",
    ]
    return "\n".join(lines)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    summaries = []
    transactions = []

    for pdf_name in PDF_NAMES:
        path = SOURCE_DIR / pdf_name
        if not path.exists():
            raise FileNotFoundError(path)
        year, month, label = parse_month(pdf_name)
        text = extract_text(path)
        summaries.append(parse_summary(text, label))
        transactions.extend(parse_transactions(text, pdf_name, year, month, label))

    summary_df = pd.DataFrame(summaries).sort_values("账单月份")
    tx_df = pd.DataFrame(transactions).sort_values(["账单月份", "交易日", "分类", "人民币金额"])
    tx_df["商户/来源"] = tx_df["交易摘要"].map(classify_merchant)

    category_df = (
        tx_df.groupby(["账单月份", "分类"], as_index=False)
        .agg(笔数=("人民币金额", "size"), 金额合计=("人民币金额", "sum"))
        .sort_values(["账单月份", "分类"])
    )
    category_pivot = (
        category_df.pivot(index="账单月份", columns="分类", values="金额合计")
        .fillna(0)
        .reset_index()
    )
    merchant_df = (
        tx_df[tx_df["分类"].isin(["消费", "退款", "分期", "预借现金", "费用", "利息"])]
        .groupby("商户/来源", as_index=False)
        .agg(笔数=("人民币金额", "size"), 金额合计=("人民币金额", "sum"))
        .sort_values("金额合计", ascending=False)
    )
    interest_df = summary_df[
        [
            "账单月份",
            "公式_上期账单金额",
            "公式_上期还款金额",
            "公式_本期账单金额",
            "公式_本期调整金额",
            "公式_循环利息",
            "本期应还金额",
        ]
    ].copy()
    interest_df["上期未还差额"] = interest_df["公式_上期账单金额"] - interest_df["公式_上期还款金额"]
    interest_df["利息占上期未还差额"] = interest_df["公式_循环利息"] / interest_df["上期未还差额"]
    interest_df["利息占上期账单金额"] = interest_df["公式_循环利息"] / interest_df["公式_上期账单金额"]
    interest_df = interest_df[
        [
            "账单月份",
            "公式_上期账单金额",
            "公式_上期还款金额",
            "上期未还差额",
            "公式_本期账单金额",
            "公式_本期调整金额",
            "公式_循环利息",
            "利息占上期未还差额",
            "利息占上期账单金额",
            "本期应还金额",
        ]
    ]
    large_tx_df = tx_df[tx_df["人民币金额"].abs() >= 1000].sort_values("人民币金额", ascending=False)

    xlsx_path = OUTPUT_DIR / "信用卡账单整理_2025-06_2026-04_含循环利息统计.xlsx"
    md_path = OUTPUT_DIR / "信用卡账单整理_2025-06_2026-04.md"
    csv_path = OUTPUT_DIR / "信用卡交易明细_2025-06_2026-04.csv"

    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
        summary_df.to_excel(writer, sheet_name="账单汇总", index=False)
        tx_df.to_excel(writer, sheet_name="交易明细", index=False)
        category_df.to_excel(writer, sheet_name="分类汇总_长表", index=False)
        category_pivot.to_excel(writer, sheet_name="分类汇总_月度", index=False)
        merchant_df.to_excel(writer, sheet_name="商户来源汇总", index=False)
        interest_df.to_excel(writer, sheet_name="循环利息统计", index=False)
        large_tx_df.to_excel(writer, sheet_name="大额交易_1000以上", index=False)

        for sheet in writer.book.worksheets:
            sheet.freeze_panes = "A2"
            for column_cells in sheet.columns:
                max_len = max(len(str(cell.value or "")) for cell in column_cells)
                sheet.column_dimensions[column_cells[0].column_letter].width = min(max(max_len + 2, 10), 42)

    tx_df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    md_path.write_text(build_report(summary_df, tx_df, category_pivot, merchant_df), encoding="utf-8")

    print(f"账单份数: {len(summary_df)}")
    print(f"交易明细笔数: {len(tx_df)}")
    print(f"Excel: {xlsx_path}")
    print(f"Markdown: {md_path}")
    print(f"CSV: {csv_path}")


if __name__ == "__main__":
    main()
