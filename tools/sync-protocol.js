#!/usr/bin/env node
/**
 * 协议同步工具
 * 将 shared/protocol 同步到 Cocos Creator 客户端项目
 *
 * 使用方法:
 * node tools/sync-protocol.js <cocos-project-path>
 *
 * 示例:
 * node tools/sync-protocol.js D:/CocosProjects/TaiXuClient
 */

const fs = require('fs');
const path = require('path');

/**
 * 递归复制目录
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 主函数
 */
function main() {
  const cocosProjectPath = process.argv[2];

  if (!cocosProjectPath) {
    console.error('请指定 Cocos 项目路径');
    console.error('用法: node tools/sync-protocol.js <cocos-project-path>');
    process.exit(1);
  }

  // 源目录 (服务器协议目录)
  const srcDir = path.resolve(__dirname, '../shared/protocol');

  // 目标目录 (Cocos 项目网络脚本目录)
  const destDir = path.resolve(cocosProjectPath, 'assets/scripts/network/protocol');

  // 检查源目录
  if (!fs.existsSync(srcDir)) {
    console.error(`源目录不存在: ${srcDir}`);
    process.exit(1);
  }

  // 检查目标目录
  if (!fs.existsSync(path.dirname(destDir))) {
    console.log(`创建目标目录: ${path.dirname(destDir)}`);
    fs.mkdirSync(path.dirname(destDir), { recursive: true });
  }

  // 复制文件
  console.log(`同步协议...`);
  console.log(`  从: ${srcDir}`);
  console.log(`  到: ${destDir}`);

  copyDir(srcDir, destDir);

  // 统计文件
  const files = fs.readdirSync(srcDir);
  console.log(`\n同步完成! 共 ${files.length} 个文件`);

  // 显示使用提示
  console.log(`\n在 Cocos 项目中使用:`);
  console.log(`  import { PlayerCodes, IUseItemReq } from './network/protocol';`);
}

main();
