/**
 * 游戏客户端
 * 业务层封装，提供类型安全的 API
 */

import { network, NetworkState } from './NetworkManager';
import {
  AuthCodes,
  PlayerCodes,
  BattleCodes,
  EconomyCodes,
  EstateCodes,
  PushCodes,
  SystemCodes,
} from './MessageCodes';

// 类型定义
interface ILoginResponse {
  playerId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewPlayer: boolean;
  playerData: IPlayerData;
}

interface IPlayerData {
  basic: {
    id: string;
    nickname: string;
    avatar: string;
    level: number;
    exp: number;
    realm: string;
    vipLevel: number;
    fightingPower: number;
  };
  currency: {
    spiritStones: number;
    contribution: number;
    prestige: number;
    immortalJade: number;
  };
  attributes: {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

interface IUseItemRequest {
  itemId: string;
  quantity: number;
}

interface IUseItemResponse {
  success: boolean;
  itemId: string;
  used: number;
}

export class GameClient {
  private static instance: GameClient;
  public static getInstance(): GameClient {
    if (!GameClient.instance) {
      GameClient.instance = new GameClient();
    }
    return GameClient.instance;
  }

  private playerData: IPlayerData | null = null;

  private constructor() {
    // 监听推送消息
    this.setupPushListeners();
  }

  // ==================== 连接管理 ====================

  /**
   * 初始化并连接服务器
   */
  public async init(protoUrl: string, wsUrl?: string, token?: string): Promise<void> {
    // 初始化 protobuf
    await network.initProtobuf(protoUrl);

    // 连接服务器
    await network.connect(wsUrl, token);

    // 设置状态监听
    network.setOnConnect(() => {
      console.log('[GameClient] Connected to server');
    });

    network.setOnDisconnect(() => {
      console.log('[GameClient] Disconnected from server');
    });
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    network.disconnect();
  }

  /**
   * 是否已连接
   */
  public isConnected(): boolean {
    return network.isConnected();
  }

  // ==================== 认证接口 ====================

  /**
   * 微信登录
   */
  public async wechatLogin(code: string): Promise<ILoginResponse> {
    const response = await network.request(AuthCodes.WECHAT_LOGIN_REQ, {
      code,
      deviceId: this.getDeviceId(),
      clientVersion: '1.0.0',
    });

    this.playerData = response.playerData;
    return response;
  }

  /**
   * 登出
   */
  public async logout(): Promise<void> {
    await network.request(AuthCodes.LOGOUT_REQ, {});
    this.playerData = null;
  }

  // ==================== 玩家接口 ====================

  /**
   * 获取玩家数据
   */
  public async getPlayerData(): Promise<IPlayerData> {
    const data = await network.request(PlayerCodes.GET_PLAYER_DATA_REQ, {});
    this.playerData = data;
    return data;
  }

  /**
   * 获取本地缓存的玩家数据
   */
  public getCachedPlayerData(): IPlayerData | null {
    return this.playerData;
  }

  /**
   * 使用物品
   */
  public async useItem(itemId: string, quantity: number): Promise<IUseItemResponse> {
    return network.request(PlayerCodes.USE_ITEM_REQ, {
      itemId,
      quantity,
    });
  }

  /**
   * 更新昵称
   */
  public async updateNickname(nickname: string): Promise<void> {
    await network.request(PlayerCodes.UPDATE_NICKNAME_REQ, { nickname });
    if (this.playerData) {
      this.playerData.basic.nickname = nickname;
    }
  }

  // ==================== 战斗接口 ====================

  /**
   * 进入副本
   */
  public async enterDungeon(dungeonId: string): Promise<any> {
    return network.request(BattleCodes.ENTER_DUNGEON_REQ, { dungeonId });
  }

  /**
   * 战斗行动
   */
  public async battleAction(action: string, targetId?: string, skillId?: string): Promise<any> {
    return network.request(BattleCodes.BATTLE_ACTION_REQ, {
      action,
      targetId,
      skillId,
    });
  }

  // ==================== 经济接口 ====================

  /**
   * 获取市场列表
   */
  public async getMarketList(itemType?: string): Promise<any[]> {
    return network.request(EconomyCodes.GET_MARKET_LIST_REQ, { itemType });
  }

  /**
   * 购买物品
   */
  public async buyItem(listingId: string): Promise<any> {
    return network.request(EconomyCodes.BUY_ITEM_REQ, { listingId });
  }

  /**
   * 出售物品
   */
  public async sellItem(itemId: string, quantity: number, price: number): Promise<any> {
    return network.request(EconomyCodes.SELL_ITEM_REQ, {
      itemId,
      quantity,
      price,
    });
  }

  // ==================== 仙府接口 ====================

  /**
   * 获取仙府数据
   */
  public async getEstateData(): Promise<any> {
    return network.request(EstateCodes.GET_ESTATE_DATA_REQ, {});
  }

  /**
   * 升级建筑
   */
  public async upgradeBuilding(buildingId: string): Promise<any> {
    return network.request(EstateCodes.UPGRADE_BUILDING_REQ, { buildingId });
  }

  /**
   * 收集灵气
   */
  public async collectSpirit(): Promise<any> {
    return network.request(EstateCodes.COLLECT_SPIRIT_REQ, {});
  }

  // ==================== 推送监听 ====================

  /**
   * 监听属性变化
   */
  public onAttributeChange(callback: (changes: any[]) => void): void {
    network.on(PushCodes.PLAYER_ATTR_CHANGED, callback);
  }

  /**
   * 监听货币变化
   */
  public onCurrencyChange(callback: (data: {
    currencyType: string;
    delta: number;
    newValue: number;
    reason: string;
  }) => void): void {
    network.on(PushCodes.CURRENCY_CHANGED, callback);
  }

  /**
   * 监听背包变化
   */
  public onInventoryChange(callback: (data: any) => void): void {
    network.on(PushCodes.INVENTORY_CHANGED, callback);
  }

  /**
   * 监听系统公告
   */
  public onSystemNotice(callback: (notice: string) => void): void {
    network.on(PushCodes.SYSTEM_NOTICE, callback);
  }

  /**
   * 监听战斗状态
   */
  public onBattleState(callback: (state: any) => void): void {
    network.on(BattleCodes.BATTLE_STATE_NOTIFY, callback);
  }

  /**
   * 监听战斗结束
   */
  public onBattleEnd(callback: (result: any) => void): void {
    network.on(BattleCodes.BATTLE_END_NOTIFY, callback);
  }

  // ==================== 私有方法 ====================

  /**
   * 设置推送监听器
   */
  private setupPushListeners(): void {
    // 属性变更
    network.on(PushCodes.PLAYER_ATTR_CHANGED, (data) => {
      console.log('[GameClient] Attribute changed:', data);
      // 更新本地数据
      if (this.playerData && data.changes) {
        data.changes.forEach((change: any) => {
          // 这里需要根据字段名更新对应的数据
          console.log(`  ${change.field}: ${change.oldValue} -> ${change.newValue}`);
        });
      }
    });

    // 货币变更
    network.on(PushCodes.CURRENCY_CHANGED, (data) => {
      console.log('[GameClient] Currency changed:', data);
      if (this.playerData) {
        const currencyMap: { [key: string]: keyof IPlayerData['currency'] } = {
          'spirit_stones': 'spiritStones',
          'contribution': 'contribution',
          'prestige': 'prestige',
          'immortal_jade': 'immortalJade',
        };
        const key = currencyMap[data.currencyType];
        if (key) {
          this.playerData.currency[key] = data.newValue;
        }
      }
    });

    // 系统公告
    network.on(PushCodes.SYSTEM_NOTICE, (notice) => {
      console.log('[GameClient] System notice:', notice);
      // 可以在这里显示游戏内公告
    });
  }

  /**
   * 获取设备 ID
   */
  private getDeviceId(): string {
    // 从本地存储获取或生成
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'web_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }
}

// 导出单例
export const gameClient = GameClient.getInstance();
