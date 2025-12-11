# 上传到 GitHub 教程

## 1. 在 GitHub 创建新仓库

1. 打开 https://github.com/new
2. 填写仓库信息：
   - **Repository name**: `hover-click`
   - **Description**: `Browser extension for auto-clicking on hover. Perfect for dual-monitor gaming.`
   - **Public** 或 **Private**（看你想不想公开）
   - **不要勾选** "Add a README file"（我们已经有了）
   - **不要勾选** "Add .gitignore"（我们已经有了）
3. 点击 **Create repository**

## 2. 在本地初始化 Git 仓库

打开命令行（CMD 或 PowerShell），进入项目目录：

```bash
cd C:\Users\CNQ\Documents\toy\llqdj
```

初始化 Git 仓库：

```bash
git init
```

## 3. 添加文件到 Git

添加所有文件：

```bash
git add .
```

查看要提交的文件（可选）：

```bash
git status
```

## 4. 创建第一次提交

```bash
git commit -m "Initial commit: hover-click browser extension"
```

## 5. 连接到 GitHub 仓库

把 `YOUR_USERNAME` 替换成你的 GitHub 用户名：

```bash
git remote add origin https://github.com/YOUR_USERNAME/hover-click.git
```

## 6. 推送到 GitHub

```bash
git branch -M main
git push -u origin main
```

## 7. 完成！

打开你的 GitHub 仓库页面，应该能看到所有文件了：
```
https://github.com/YOUR_USERNAME/hover-click
```

---

## 后续更新代码

以后修改代码后，只需要：

```bash
# 1. 添加修改的文件
git add .

# 2. 提交修改
git commit -m "描述你的修改"

# 3. 推送到 GitHub
git push
```

---

## 常见问题

### 如果推送时要求输入用户名密码

GitHub 已经不支持密码登录了，需要使用 Personal Access Token：

1. 去 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成后复制 token
5. 推送时用 token 代替密码

### 如果想修改仓库名

在 GitHub 仓库页面：
1. 点击 **Settings**
2. 在 **Repository name** 处修改
3. 点击 **Rename**

然后在本地更新远程地址：

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/NEW_NAME.git
```
