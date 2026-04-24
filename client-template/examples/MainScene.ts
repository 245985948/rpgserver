/**
 * 主场景示例
 * 展示游戏内常用操作：获取数据、使用物品、监听推送等
 */

import { _decorator, Component, Label, Button, director } from 'cc';
import { gameClient } from '../network';

const { ccclass, property } = _decorator;

@ccclass('MainScene')
export class MainScene extends Component {
    @property(Label)
    private playerNameLabel: Label | null = null;

    @property(Label)
    private currencyLabel: Label | null = null;

    @property(Label)
    private statusLabel: Label | null = null;

    @property(Button)
    private refreshButton: Button | null = null;

    @property(Button)
    private useItemButton: Button | null = null;

    async start() {
        // 加载玩家数据
        await this.loadPlayerData();

        // 设置推送监听
        this.setupPushListeners();

        // 设置按钮事件
        this.refreshButton?.node.on(Button.EventType.CLICK, this.onRefresh, this);
        this.useItemButton?.node.on(Button.EventType.CLICK, this.onUseItem, this);
    }

    onDestroy() {
        // 清理事件监听
        this.refreshButton?.node.off(Button.EventType.CLICK, this.onRefresh, this);
        this.useItemButton?.node.off(Button.EventType.CLICK, this.onUseItem, this);
    }

    /**
     * 加载玩家数据
     */
    async loadPlayerData() {
        try {
            this.updateStatus('正在加载数据...');

            const playerData = await gameClient.getPlayerData();

            // 更新 UI
            if (this.playerNameLabel) {
                this.playerNameLabel.string = `${playerData.basic.nickname} Lv.${playerData.basic.level}`;
            }

            if (this.currencyLabel) {
                this.currencyLabel.string = `
灵石: ${playerData.currency.spiritStones}
贡献: ${playerData.currency.contribution}
仙玉: ${playerData.currency.immortalJade}
                `.trim();
            }

            this.updateStatus('数据加载完成');

        } catch (error) {
            this.updateStatus(`加载失败: ${error}`);
        }
    }

    /**
     * 刷新按钮点击
     */
    async onRefresh() {
        await this.loadPlayerData();
    }

    /**
     * 使用物品按钮点击
     */
    async onUseItem() {
        try {
            this.updateStatus('正在使用物品...');

            const result = await gameClient.useItem('hp_potion_001', 1);

            if (result.success) {
                this.updateStatus(`使用了 ${result.used} 个 ${result.itemId}`);
            } else {
                this.updateStatus('使用物品失败');
            }

        } catch (error) {
            this.updateStatus(`使用物品失败: ${error}`);
        }
    }

    /**
     * 进入副本
     */
    async enterDungeon() {
        try {
            this.updateStatus('正在进入副本...');

            const result = await gameClient.enterDungeon('dungeon_001');
            this.updateStatus('已进入副本！');

            // 跳转到战斗场景
            director.loadScene('BattleScene');

        } catch (error) {
            this.updateStatus(`进入副本失败: ${error}`);
        }
    }

    /**
     * 设置推送监听
     */
    private setupPushListeners() {
        // 属性变化
        gameClient.onAttributeChange((changes) => {
            console.log('[MainScene] 属性变化:', changes);
            this.updateStatus('属性已更新');
            this.loadPlayerData(); // 刷新显示
        });

        // 货币变化
        gameClient.onCurrencyChange((data) => {
            console.log(`[MainScene] 货币变化: ${data.currencyType} ${data.delta}`);
            this.updateStatus(`${data.currencyType}: ${data.delta > 0 ? '+' : ''}${data.delta}`);
            this.loadPlayerData(); // 刷新显示
        });

        // 背包变化
        gameClient.onInventoryChange((data) => {
            console.log('[MainScene] 背包变化:', data);
            this.updateStatus(`物品 ${data.itemName} x${data.delta}`);
        });

        // 系统公告
        gameClient.onSystemNotice((notice) => {
            console.log('[MainScene] 系统公告:', notice);
            // 可以显示一个弹窗或跑马灯
            this.updateStatus(`[公告] ${notice}`);
        });
    }

    /**
     * 更新状态文本
     */
    private updateStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
        console.log('[MainScene]', text);
    }
}
