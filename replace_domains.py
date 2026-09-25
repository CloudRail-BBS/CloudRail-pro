import io

path = r'C:\Users\1\Downloads\社区项目\common\config.js'
with io.open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 保存原始内容用于恢复
with io.open(path + '.bak', 'w', encoding='utf-8') as f:
    f.write(content)
print('✅ 已备份原始配置')

# 替换为示例域名
replacements = [
    ('https://sq.baige.icu/api/index.php/', 'https://api.example.com/api/index.php/'),
    ('http://lhc.baige.icu/', 'http://admin.example.com/'),
    ('https://sq.baige.icu/', 'https://www.example.com/'),
    ('ws://sq.baige.icu//ws', 'ws://api.example.com/ws'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f'✅ 已替换: {old} → {new}')
    else:
        print(f'⚠️  未找到: {old}')

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\n✅ 域名已替换为示例域名')
