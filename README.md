# FIRE 账本 Web 版

这是一个纯静态 PWA。页面代码通过 GitHub Pages 托管，账本数据只保存在使用设备的 IndexedDB 中。

## 首次上传

```bash
cd /Users/rachellee/code/fire/web
git init -b main
git add .
git commit -m "Initial FIRE web app"
git remote add origin https://github.com/<你的用户名>/fire-web.git
git push -u origin main
```

GitHub 仓库的 Pages 设置选择 `main` 分支和根目录 `/`。

## 后续同步

```bash
cd /Users/rachellee/code/fire/web
git pull --rebase
git add .
git commit -m "描述本次修改"
git push
```

推送完成后，GitHub Pages 会自动重新部署。`git pull --rebase` 用于先同步 GitHub 上可能存在的修改，避免直接覆盖远程提交。

不要将 JSON 备份、个人财务数据或 `.DS_Store` 提交到仓库。
