#!/bin/zsh -l
cd -- "$(dirname -- "$0")" || exit 1
if npm run blog:sync; then
  print '\n同步完成。预览已经运行时，刷新 http://127.0.0.1:8092/ 即可查看。'
else
  print '\n同步失败，请根据上面的提示检查配置。'
fi
read -r '?按回车关闭窗口：'
