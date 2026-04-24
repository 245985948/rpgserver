/**
 * 游戏系统枚举定义
 * 包含所有模块所需的枚举类型
 */

/** 修真境界枚举 */
export enum Realm {
  QI_REFINING = 'qi_refining',           // 练气期
  FOUNDATION = 'foundation',             // 筑基期
  GOLDEN_CORE = 'golden_core',           // 金丹期
  NASCENT_SOUL = 'nascent_soul',         // 元婴期
  SPIRIT_SEVERING = 'spirit_severance',  // 化神期
  VOID_RETURN = 'void_return',           // 返虚期
  TRIBULATION = 'tribulation',           // 渡劫期
  TRUE_IMMORTAL = 'true_immortal',       // 真仙期
}

/** 战斗属性类型枚举 */
export enum CombatAttribute {
  REALM = 'realm',           // 境界
  PHYSIQUE = 'physique',     // 肉身
  SPIRIT = 'spirit',         // 神识
  GANG_QI = 'gang_qi',       // 罡气
  PROTECTION = 'protection', // 护体
  SWORD_ART = 'sword_art',   // 剑术
  TELEKINESIS = 'telekinesis', // 御物
  SPELL = 'spell',           // 术法
}

/** 生产技能类型枚举 */
export enum ProductionSkill {
  BREATHING = 'breathing',     // 吐纳
  HERB_GATHERING = 'herb_gathering', // 采药
  BAMBOO_CUTTING = 'bamboo_cutting', // 伐竹
  ARTIFACT_REFINING = 'artifact_refining', // 炼器
  TALISMAN_MAKING = 'talisman_making', // 制符
  CLOTH_WEAVING = 'cloth_weaving', // 织衣
  SPIRITUAL_FOOD = 'spiritual_food', // 灵膳
  BREWING = 'brewing',         // 酿酒
  ALCHEMY = 'alchemy',         // 炼丹
  NURTURING = 'nurturing',     // 温养
}

/** 流派类型枚举 */
export enum CombatStyle {
  SWORD_CULTIVATOR = 'sword_cultivator',   // 剑修
  SPELL_CULTIVATOR = 'spell_cultivator',   // 法修
  BODY_CULTIVATOR = 'body_cultivator',     // 体修
  HYBRID = 'hybrid',                       //  hybrid流派
}

/** 货币类型枚举 */
export enum CurrencyType {
  SPIRIT_STONE = 'spirit_stone',   // 灵石（主要流通货币）
  IMMORTAL_JADE = 'immortal_jade', // 仙玉（付费充值）
  MERIT = 'merit',                 // 天道功德（社区互动）
}

/** 装备部位枚举 */
export enum EquipmentSlot {
  WEAPON = 'weapon',       // 武器
  ARMOR = 'armor',         // 防具
  HELMET = 'helmet',       // 头盔
  BOOTS = 'boots',         // 靴子
  ACCESSORY1 = 'accessory1', // 饰品1
  ACCESSORY2 = 'accessory2', // 饰品2
}

/** 仙府建筑类型枚举 */
export enum BuildingType {
  SPIRIT_GATHERING = 'spirit_gathering',   // 聚灵阵
  HERB_GARDEN = 'herb_garden',             // 灵药园
  BAMBOO_FOREST = 'bamboo_forest',         // 灵竹林
  FORGE = 'forge',                         // 炼器坊
  TALISMAN_ROOM = 'talisman_room',         // 制符室
  WEAVING_ROOM = 'weaving_room',           // 织衣阁
  KITCHEN = 'kitchen',                     // 灵膳房
  WINERY = 'winery',                       // 酿酒窖
  ALCHEMY_ROOM = 'alchemy_room',           // 炼丹房
  NURTURING_ROOM = 'nurturing_room',       // 温养室
  LIBRARY = 'library',                     // 藏书阁
  MEDITATION_ROOM = 'meditation_room',     // 静室
  WAREHOUSE = 'warehouse',                 // 仓库
  SPIRIT_POOL = 'spirit_pool',             // 灵泉
}

/** 交易类型枚举 */
export enum TradeType {
  DIRECT = 'direct',       // 直接交易
  AUCTION = 'auction',     // 拍卖
  MARKET = 'market',       // 坊市
}

/** 玩家状态枚举 */
export enum PlayerStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  IN_BATTLE = 'in_battle',
  IN_DUNGEON = 'in_dungeon',
}

/** 九幽幻境道具枚举 */
export enum DungeonItem {
  GUIDING_TALISMAN = 'guiding_talisman',   // 引路符
  CONCEALMENT_ARRAY = 'concealment_array', // 隐匿阵
}
