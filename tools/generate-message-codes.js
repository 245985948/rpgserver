#!/usr/bin/env node
/**
 * 消息码生成工具
 * 从 YAML/JSON 配置文件生成 TypeScript 常量定义
 *
 * 使用方法:
 * node tools/generate-message-codes.js <config-file> [output-dir]
 *
 * 示例配置 (message-codes.yaml):
 * modules:
 *   - name: System
 *     base: 0
 *     messages:
 *       - { name: HEARTBEAT_REQ, code: 0, desc: "心跳请求" }
 *       - { name: HEARTBEAT_RESP, code: 1, desc: "心跳响应" }
 *
 *   - name: Auth
 *     base: 1000
 *     messages:
 *       - { name: WECHAT_LOGIN_REQ, code: 1000 }
 *       - { name: WECHAT_LOGIN_RESP, code: 1001 }
 */

const fs = require('fs');
const path = require('path');

// 默认配置
const DEFAULT_CONFIG = {
  modules: [
    {
      name: 'System',
      base: 0,
      messages: [
        { name: 'HEARTBEAT_REQ', code: 0, desc: '心跳请求' },
        { name: 'HEARTBEAT_RESP', code: 1, desc: '心跳响应' },
        { name: 'ERROR_RESP', code: 2, desc: '错误响应' },
        { name: 'TIME_SYNC_REQ', code: 4, desc: '时间同步请求' },
        { name: 'TIME_SYNC_RESP', code: 5, desc: '时间同步响应' },
      ],
    },
    {
      name: 'Auth',
      base: 1000,
      messages: [
        { name: 'WECHAT_LOGIN_REQ', code: 1000, desc: '微信登录请求' },
        { name: 'WECHAT_LOGIN_RESP', code: 1001, desc: '微信登录响应' },
        { name: 'REFRESH_TOKEN_REQ', code: 1002, desc: '刷新Token请求' },
        { name: 'REFRESH_TOKEN_RESP', code: 1003, desc: '刷新Token响应' },
        { name: 'LOGOUT_REQ', code: 1004, desc: '登出请求' },
        { name: 'LOGOUT_RESP', code: 1005, desc: '登出响应' },
      ],
    },
    {
      name: 'Player',
      base: 2000,
      messages: [
        { name: 'GET_PLAYER_DATA_REQ', code: 2000, desc: '获取玩家数据请求' },
        { name: 'GET_PLAYER_DATA_RESP', code: 2001, desc: '获取玩家数据响应' },
        { name: 'GET_INVENTORY_REQ', code: 2002, desc: '获取背包请求' },
        { name: 'GET_INVENTORY_RESP', code: 2003, desc: '获取背包响应' },
        { name: 'USE_ITEM_REQ', code: 2004, desc: '使用物品请求' },
        { name: 'USE_ITEM_RESP', code: 2005, desc: '使用物品响应' },
      ],
    },
  ],

  serverPush: {
    base: 900000,
    messages: [
      { name: 'PLAYER_ATTR_CHANGED', code: 900000, desc: '玩家属性变更推送' },
      { name: 'CURRENCY_CHANGED', code: 900001, desc: '货币变更推送' },
      { name: 'INVENTORY_CHANGED', code: 900002, desc: '背包变更推送' },
      { name: 'LEVEL_UP_PUSH', code: 900003, desc: '升级推送' },
    ],
  },

  errors: {
    // 系统错误
    SUCCESS: 0,
    UNKNOWN_ERROR: 1000,
    INVALID_REQUEST: 1001,
    UNAUTHORIZED: 2000,
    TOKEN_EXPIRED: 2001,
    // ... 更多错误码
  },
};

/**
 * 生成 TypeScript 代码
 */
function generateTypeScript(config) {
  let code = `/**
 * 消息码定义
 * 此文件由工具自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

`;

  // 生成各模块消息码
  for (const module of config.modules) {
    code += `// ============================================\n`;
    code += `// ${module.name}模块 (${String(module.base).padStart(6, '0')} - ${String(module.base + 999).padStart(6, '0')})\n`;
    code += `// ============================================\n\n`;
    code += `export const ${module.name}Codes = {\n`;

    for (const msg of module.messages) {
      const desc = msg.desc ? ` // ${msg.desc}` : '';
      code += `  /** ${msg.desc || msg.name} */\n`;
      code += `  ${msg.name}: ${msg.code},${desc}\n`;
    }

    code += `} as const;\n\n`;
  }

  // 生成服务器推送码
  if (config.serverPush) {
    code += `// ============================================\n`;
    code += `// 服务器推送 (${config.serverPush.base} - 999999)\n`;
    code += `// ============================================\n\n`;
    code += `export const ServerPushCodes = {\n`;

    for (const msg of config.serverPush.messages) {
      code += `  /** ${msg.desc || msg.name} */\n`;
      code += `  ${msg.name}: ${msg.code},\n`;
    }

    code += `} as const;\n\n`;
  }

  // 生成错误码
  if (config.errors) {
    code += `// ============================================\n`;
    code += `// 错误码\n`;
    code += `// ============================================\n\n`;
    code += `export const ErrorCodes = {\n`;

    for (const [name, value] of Object.entries(config.errors)) {
      code += `  ${name}: ${value},\n`;
    }

    code += `} as const;\n\n`;
  }

  // 生成合并的对象
  code += `// ============================================\n`;
  code += `// 所有消息码合并\n`;
  code += `// ============================================\n\n`;
  code += `export const MessageCodes = {\n`;
  for (const module of config.modules) {
    code += `  ...${module.name}Codes,\n`;
  }
  if (config.serverPush) {
    code += `  ...ServerPushCodes,\n`;
  }
  if (config.errors) {
    code += `  ...ErrorCodes,\n`;
  }
  code += `} as const;\n\n`;

  // 生成反向查找函数
  code += `// ============================================\n`;
  code += `// 工具函数\n`;
  code += `// ============================================\n\n`;
  code += `const allCodes: Record<string, number> = {\n`;
  code += `  ...MessageCodes,\n`;
  code += `};\n\n`;
  code += `/** 根据消息号获取消息名称 */\n`;
  code += `export function getMessageName(code: number): string {\n`;
  code += `  const entry = Object.entries(allCodes).find(([, v]) => v === code);\n`;
  code += `  return entry?.[0] || \`UNKNOWN(\${code})\`;\n`;
  code += `}\n\n`;
  code += `/** 获取消息号所属的模块 */\n`;
  code += `export function getMessageModule(code: number): string {\n`;
  for (const module of config.modules) {
    code += `  if (code >= ${module.base} && code < ${module.base + 1000}) return '${module.name.toUpperCase()}';\n`;
  }
  if (config.serverPush) {
    code += `  if (code >= ${config.serverPush.base}) return 'PUSH';\n`;
  }
  code += `  return 'UNKNOWN';\n`;
  code += `}\n\n`;
  code += `/** 判断是否为请求消息 */\n`;
  code += `export function isRequest(code: number): boolean {\n`;
  code += `  return code % 2 === 0 && code < ${config.serverPush?.base || 900000};\n`;
  code += `}\n\n`;
  code += `/** 判断是否为响应消息 */\n`;
  code += `export function isResponse(code: number): boolean {\n`;
  code += `  return code % 2 === 1 && code < ${config.serverPush?.base || 900000};\n`;
  code += `}\n`;

  return code;
}

/**
 * 生成 C# 代码 (供 Unity 客户端使用)
 */
function generateCSharp(config) {
  let code = `// 消息码定义
// 此文件由工具自动生成，请勿手动修改
// 生成时间: ${new Date().toISOString()}

namespace TaiXu.Protocol
{
    public static class MessageCodes
    {
`;

  // 各模块
  for (const module of config.modules) {
    code += `        // ${module.name}模块\n`;
    code += `        public static class ${module.name}\n`;
    code += `        {\n`;
    for (const msg of module.messages) {
      code += `            public const int ${msg.name} = ${msg.code};\n`;
    }
    code += `        }\n\n`;
  }

  // 服务器推送
  if (config.serverPush) {
    code += `        // 服务器推送\n`;
    code += `        public static class ServerPush\n`;
    code += `        {\n`;
    for (const msg of config.serverPush.messages) {
      code += `            public const int ${msg.name} = ${msg.code};\n`;
    }
    code += `        }\n\n`;
  }

  // 错误码
  if (config.errors) {
    code += `        // 错误码\n`;
    code += `        public enum ErrorCode\n`;
    code += `        {\n`;
    for (const [name, value] of Object.entries(config.errors)) {
      code += `            ${name} = ${value},\n`;
    }
    code += `        }\n`;
  }

  code += `    }\n}`;

  return code;
}

/**
 * 生成 Lua 代码 (供客户端使用)
 */
function generateLua(config) {
  let code = `-- 消息码定义
-- 此文件由工具自动生成，请勿手动修改
-- 生成时间: ${new Date().toISOString()}

local MessageCodes = {}

`;

  for (const module of config.modules) {
    code += `-- ${module.name}模块\n`;
    code += `MessageCodes.${module.name} = {\n`;
    for (const msg of module.messages) {
      code += `  ${msg.name} = ${msg.code},\n`;
    }
    code += `}\n\n`;
  }

  if (config.serverPush) {
    code += `-- 服务器推送\n`;
    code += `MessageCodes.ServerPush = {\n`;
    for (const msg of config.serverPush.messages) {
      code += `  ${msg.name} = ${msg.code},\n`;
    }
    code += `}\n\n`;
  }

  if (config.errors) {
    code += `-- 错误码\n`;
    code += `MessageCodes.ErrorCode = {\n`;
    for (const [name, value] of Object.entries(config.errors)) {
      code += `  ${name} = ${value},\n`;
    }
    code += `}\n\n`;
  }

  code += `return MessageCodes\n`;
  return code;
}

// 主函数
function main() {
  const configPath = process.argv[2];
  const outputDir = process.argv[3] || './src/shared/constants';

  let config = DEFAULT_CONFIG;

  // 如果提供了配置文件，读取它
  if (configPath && fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    if (configPath.endsWith('.json')) {
      config = JSON.parse(content);
    } else if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
      // 需要安装 yaml 包
      console.error('YAML support requires js-yaml package');
      process.exit(1);
    }
  }

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 生成各语言代码
  const tsCode = generateTypeScript(config);
  const csCode = generateCSharp(config);
  const luaCode = generateLua(config);

  // 写入文件
  fs.writeFileSync(path.join(outputDir, 'message-codes.generated.ts'), tsCode);
  fs.writeFileSync(path.join(outputDir, 'MessageCodes.cs'), csCode);
  fs.writeFileSync(path.join(outputDir, 'message_codes.lua'), luaCode);

  console.log('Generated files:');
  console.log(`  - ${path.join(outputDir, 'message-codes.generated.ts')}`);
  console.log(`  - ${path.join(outputDir, 'MessageCodes.cs')}`);
  console.log(`  - ${path.join(outputDir, 'message_codes.lua')}`);
}

main();
