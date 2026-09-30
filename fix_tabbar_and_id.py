import io

# 1. 修改 mine.vue 中的"抖音号"改成"栖屿号"
path1 = r'C:\Users\1\Downloads\社区项目\pages\mine\mine.vue'
with io.open(path1, 'r', encoding='utf-8') as f:
    content1 = f.read()

content1 = content1.replace('抖音号：{{ userInfo.uid || userInfo.username }}', '栖屿号：{{ userInfo.uid || userInfo.username }}')

with io.open(path1, 'w', encoding='utf-8') as f:
    f.write(content1)

print('✅ mine.vue: "抖音号"已改成"栖屿号"')

# 2. 修改 CustomTabBar.vue 改成纯文字样式
path2 = r'C:\Users\1\Downloads\社区项目\components\CustomTabBar.vue'
with io.open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

# 先看看当前内容
print('\nCustomTabBar.vue 当前状态:')
print(content2[:500])
