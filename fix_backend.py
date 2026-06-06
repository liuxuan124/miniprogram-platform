"""
Comprehensive fix for backend compilation errors.
Root cause: Lombok annotations not being processed by Maven compiler.
Strategy: Ensure all entity/DTO/VO classes have proper @Data/@Getter/@Setter/@Builder annotations,
and all ServiceImpl classes have @Slf4j. Also fix import issues.
"""
import os, re

BASE = r"D:\项目管理\小程序搭建与管理系统\backend\src\main\java\com\miniprogram"

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def has_annotation(content, ann):
    """Check if class has a specific Lombok annotation"""
    return re.search(rf'@{ann}\b', content) is not None

def add_annotation(content, ann):
    """Add a Lombok annotation before the class declaration"""
    # Find the class/interface/enum declaration
    pattern = r'((?:public|private|protected)?\s*(?:abstract\s+)?(?:class|interface|enum)\s+)'
    match = re.search(pattern, content)
    if match:
        pos = match.start()
        # Check if there's already a newline before
        insert = f'@{ann}\n'
        content = content[:pos] + insert + content[pos:]
    return content

def ensure_import(content, import_stmt):
    """Ensure an import statement exists"""
    if import_stmt in content:
        return content, False
    lines = content.split('\n')
    last_import = -1
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import = i
    if last_import >= 0:
        lines.insert(last_import + 1, import_stmt)
        return '\n'.join(lines), True
    return content, False

fixed = []

for root, dirs, files in os.walk(BASE):
    for f in files:
        if not f.endswith('.java'):
            continue
        path = os.path.join(root, f)
        content = read(path)
        orig = content
        changed = False
        
        # === Fix 1: IService import ===
        if 'IService<' in content and 'import com.baomidou.mybatisplus.extension.service.IService' not in content:
            content, c = ensure_import(content, 'import com.baomidou.mybatisplus.extension.service.IService;')
            changed = changed or c
        
        # === Fix 2: BaseEntity import ===
        if 'extends BaseEntity' in content and 'import com.miniprogram.common.BaseEntity' not in content:
            content, c = ensure_import(content, 'import com.miniprogram.common.BaseEntity;')
            changed = changed or c
        
        # === Fix 3: OperationLogAspect naming conflict ===
        if 'OperationLogAspect' in f:
            # Replace new OperationLog( with fully qualified entity reference
            if 'new OperationLog(' in content:
                content = content.replace('new OperationLog(', 'new com.miniprogram.entity.OperationLog(')
                changed = True
        
        # === Fix 4: AiRecommendationService - missing import ===
        if 'AiRecommendationService' in f and 'AiConversation' in content:
            if 'import com.miniprogram.entity.AiConversation' not in content:
                content, c = ensure_import(content, 'import com.miniprogram.entity.AiConversation;')
                changed = changed or c
            # Remove bad package reference
            content = re.sub(r'(?<!import\s)AiConversation\.', 'com.miniprogram.entity.AiConversation.', content)
            # But don't double-qualify
            content = content.replace('com.miniprogram.entity.com.miniprogram.entity.AiConversation.', 'com.miniprogram.entity.AiConversation.')
        
        # === Fix 5: @Slf4j for classes using log ===
        if 'log.' in content or 'log ,' in content:
            if not has_annotation(content, 'Slf4j') and 'private static final Logger' not in content:
                content = add_annotation(content, 'Slf4j')
                content, c = ensure_import(content, 'import lombok.extern.slf4j.Slf4j;')
                changed = True
        
        # === Fix 6: @Data for entity classes (if missing getter/setter) ===
        # Check if it's an entity class with fields but no @Data/@Getter/@Setter
        is_entity = 'extends BaseEntity' in content or ('@TableName' in content)
        is_dto = 'DTO' in f or 'VO' in f or 'QueryDTO' in f
        is_model = is_entity or is_dto
        
        if is_model:
            if not has_annotation(content, 'Data') and not has_annotation(content, 'Getter'):
                # Check if it has private fields
                if re.search(r'private\s+\w+', content):
                    content = add_annotation(content, 'Data')
                    content, c = ensure_import(content, 'import lombok.Data;')
                    changed = True
            # Check for @Builder if builder() is used elsewhere
            if 'builder()' in content or '.builder()' in content:
                if not has_annotation(content, 'Builder') and not has_annotation(content, 'Accessors'):
                    # Only add @Builder to DTOs/VOs, not entities
                    if is_dto:
                        content = add_annotation(content, 'Builder')
                        content, c = ensure_import(content, 'import lombok.Builder;')
                        # Also need @AllArgsConstructor and @NoArgsConstructor
                        if not has_annotation(content, 'AllArgsConstructor'):
                            content = add_annotation(content, 'AllArgsConstructor')
                            content, c = ensure_import(content, 'import lombok.AllArgsConstructor;')
                        if not has_annotation(content, 'NoArgsConstructor'):
                            content = add_annotation(content, 'NoArgsConstructor')
                            content, c = ensure_import(content, 'import lombok.NoArgsConstructor;')
                        changed = True

        if content != orig:
            write(path, content)
            fixed.append(os.path.relpath(path, BASE))

print(f"Fixed {len(fixed)} files:")
for f in fixed:
    print(f"  {f}")
