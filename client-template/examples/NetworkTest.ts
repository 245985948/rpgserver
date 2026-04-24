/**
 * 网络测试组件
 * 用于测试 WebSocket 连接、Protobuf 编解码、消息收发
 */

import { _decorator, Component, Label, Button, EditBox } from 'cc';
import { network, NetworkState } from '../network';
import { SystemCodes, PlayerCodes } from '../network/MessageCodes';

const { ccclass, property } = _decorator;

@ccclass('NetworkTest')
export class NetworkTest extends Component {
    @property(EditBox)
    private serverUrlInput: EditBox | null = null;

    @property(EditBox)
    private protoUrlInput: EditBox | null = null;

    @property(Label)
    private logLabel: Label | null = null;

    @property(Button)
    private connectButton: Button | null = null;

    @property(Button)
    private testButton: Button | null = null;

    @property(Button)
    private disconnectButton: Button | null = null;

    private logs: string[] = [];

    start() {
        // 设置默认值
        if (this.serverUrlInput) {
            this.serverUrlInput.string = 'ws://localhost:3000/game';
        }
        if (this.protoUrlInput) {
            this.protoUrlInput.string = 'proto/game.proto';
        }

        // 绑定按钮事件
        this.connectButton?.node.on(Button.EventType.CLICK, this.onConnect, this);
        this.testButton?.node.on(Button.EventType.CLICK, this.onTest, this);
        this.disconnectButton?.node.on(Button.EventType.CLICK, this.onDisconnect, this);

        // 设置网络回调
        network.setOnConnect(() => {
            this.log('✓ 已连接到服务器');
            this.updateUIState(true);
        });

        network.setOnDisconnect(() => {
            this.log('✗ 已断开连接');
            this.updateUIState(false);
        });

        network.setOnError((err) => {
            this.log(`✗ 连接错误: ${err}`);
        });
    }

    onDestroy() {
        this.connectButton?.node.off(Button.EventType.CLICK, this.onConnect, this);
        this.testButton?.node.off(Button.EventType.CLICK, this.onTest, this);
        this.disconnectButton?.node.off(Button.EventType.CLICK, this.onDisconnect, this);
    }

    /**
     * 连接按钮点击
     */
    async onConnect() {
        const serverUrl = this.serverUrlInput?.string || 'ws://localhost:3000/game';
        const protoUrl = this.protoUrlInput?.string || 'proto/game.proto';

        this.log(`正在连接 ${serverUrl}...`);

        try {
            // 初始化 protobuf
            this.log('加载 protobuf...');
            const protoLoaded = await network.initProtobuf(protoUrl);
            this.log(protoLoaded ? '✓ Protobuf 加载成功' : '✗ Protobuf 加载失败，将使用 JSON');

            // 连接服务器
            await network.connect(serverUrl);

        } catch (error) {
            this.log(`✗ 连接失败: ${error}`);
        }
    }

    /**
     * 测试按钮点击
     */
    async onTest() {
        if (!network.isConnected()) {
            this.log('✗ 请先连接服务器');
            return;
        }

        // 测试 1: 心跳
        this.log('--- 测试心跳 ---');
        try {
            network.notify(SystemCodes.HEARTBEAT_REQ, {});
            this.log('✓ 心跳已发送');
        } catch (error) {
            this.log(`✗ 心跳失败: ${error}`);
        }

        // 测试 2: 获取玩家数据
        this.log('--- 测试获取玩家数据 ---');
        try {
            const result = await network.request(PlayerCodes.GET_PLAYER_DATA_REQ, {});
            this.log(`✓ 获取成功: ${JSON.stringify(result, null, 2)}`);
        } catch (error) {
            this.log(`✗ 获取失败: ${error}`);
        }

        // 测试 3: 使用物品
        this.log('--- 测试使用物品 ---');
        try {
            const result = await network.request(PlayerCodes.USE_ITEM_REQ, {
                itemId: 'test_item_001',
                quantity: 1,
            });
            this.log(`✓ 使用成功: ${JSON.stringify(result)}`);
        } catch (error) {
            this.log(`✗ 使用失败: ${error}`);
        }
    }

    /**
     * 断开按钮点击
     */
    onDisconnect() {
        network.disconnect();
        this.updateUIState(false);
    }

    /**
     * 更新 UI 状态
     */
    private updateUIState(connected: boolean) {
        if (this.connectButton) {
            this.connectButton.interactable = !connected;
        }
        if (this.testButton) {
            this.testButton.interactable = connected;
        }
        if (this.disconnectButton) {
            this.disconnectButton.interactable = connected;
        }
    }

    /**
     * 添加日志
     */
    private log(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;

        console.log('[NetworkTest]', message);
        this.logs.push(logEntry);

        // 只保留最近 50 条
        if (this.logs.length > 50) {
            this.logs.shift();
        }

        // 更新显示
        if (this.logLabel) {
            this.logLabel.string = this.logs.join('\n');
        }
    }
}
