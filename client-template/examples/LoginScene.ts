/**
 * 登录场景示例
 * 展示如何使用 GameClient 进行登录和获取数据
 */

import { _decorator, Component, Label, Button, EditBox, director } from 'cc';
import { gameClient, NetworkState } from '../network';

const { ccclass, property } = _decorator;

@ccclass('LoginScene')
export class LoginScene extends Component {
    @property(EditBox)
    private codeInput: EditBox | null = null;

    @property(Label)
    private statusLabel: Label | null = null;

    @property(Button)
    private loginButton: Button | null = null;

    @property(Label)
    private playerInfoLabel: Label | null = null;

    async start() {
        this.updateStatus('正在连接服务器...');

        try {
            // 初始化网络连接
            await gameClient.init(
                'proto/game.proto',  // proto 文件路径
                'ws://localhost:3000/game'  // WebSocket 服务器地址
            );

            this.updateStatus('连接成功，请登录');
            this.loginButton!.interactable = true;

        } catch (error) {
            this.updateStatus(`连接失败: ${error}`);
        }

        // 设置连接状态监听
        gameClient.onDisconnect(() => {
            this.updateStatus('连接已断开');
        });
    }

    /**
     * 登录按钮点击事件
     */
    async onLoginClick() {
        const code = this.codeInput?.string || 'test_code';

        this.updateStatus('正在登录...');
        this.loginButton!.interactable = false;

        try {
            // 调用微信登录
            const result = await gameClient.wechatLogin(code);

            this.updateStatus('登录成功！');
            this.showPlayerInfo(result.playerData);

            // 延迟跳转到主场景
            this.scheduleOnce(() => {
                director.loadScene('MainScene');
            }, 2);

        } catch (error) {
            this.updateStatus(`登录失败: ${error}`);
            this.loginButton!.interactable = true;
        }
    }

    /**
     * 更新状态文本
     */
    private updateStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
        console.log('[LoginScene]', text);
    }

    /**
     * 显示玩家信息
     */
    private showPlayerInfo(playerData: any) {
        if (this.playerInfoLabel) {
            this.playerInfoLabel.string = `
玩家: ${playerData.basic.nickname}
等级: ${playerData.basic.level}
境界: ${playerData.basic.realm}
战力: ${playerData.basic.fightingPower}
            `.trim();
        }
    }
}
