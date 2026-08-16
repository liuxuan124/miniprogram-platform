-- 页面版本表补充外键，删除页面时级联清理版本记录
DELETE v FROM mp_page_version v
LEFT JOIN mp_page p ON v.page_id = p.id
WHERE p.id IS NULL;

ALTER TABLE mp_page_version
    ADD CONSTRAINT fk_mp_page_version_page_id
        FOREIGN KEY (page_id) REFERENCES mp_page (id)
        ON DELETE CASCADE;
