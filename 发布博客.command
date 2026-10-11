#!/bin/zsh -l
cd -- "$(dirname -- "$0")" || exit 1
if npm run blog:publish; then
  print '\n已推送 GitHub，部署结果请查看仓库 Actions。'
else
  print '\n发布未完成，请根据上面的提示处理后重试。'
fi
read -r '?按回车关闭窗口：'
