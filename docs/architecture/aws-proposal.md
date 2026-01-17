# AWS構成案（リアルタイム位置共有 / 同時接続8人想定）

## 目的と前提
- Unity NetCode のヘッドレスサーバーを自前ホスト（AWS）し、プレイヤー位置などをサーバー権限で同期。
- 常時 8 同時接続を 24/7 で捌くシンプル構成を優先。大きくなったらスケール案を追加で検討。
- リージョン例: ap-northeast-1（東京）前提のざっくり概算。
- プロトタイプ段階なのでマネージドを最小限、運用をシンプルに。

## 全体アーキテクチャ（最小構成）
```
[Client(Unity)] --UDP/TCP 7777--> [Elastic IP] --SG--> [EC2 t3.small (GameServer)]
                                             \--CloudWatch Logs/Alarms
[Develop PC] --S3 sync--> [S3 build-bucket] --user-data--> [Launch Template]
```
- **VPC (10.0.0.0/24)** + **Public Subnet** 1つ。NAT不要（サーバーは外向き通信ほぼ無し）。
- **EC2 ゲームサーバー**: t3.small / Amazon Linux 2 + systemd で headless Unity サーバー起動。
- **Elastic IP**: クライアント接続先を固定化。
- **Security Group**: UDP 7777 (ゲーム), TCP 22 (管理), 必要なら TCP 80/443 (ヘルス/将来のAPI)。
- **S3**: サーバービルド成果物格納（手動配置でも可）。
- **CloudWatch Logs**: サーバー標準出力/エラーログ収集。
- **CloudWatch Alarms**: CPU/メモリ（CW Agent）で閾値超過通知（Slack/SNS）。
- **(任意) Auto Scaling Group**: 最低1台・最大1台でヘルスチェック時の自動再起動だけ利用。
- **(任意) Route53**: `game.example.com` を Elastic IP に A レコードで割当。

## 位置共有の流れ（サーバー権限）
- クライアントは **Unity NetCode** で入力/位置を送信（UDP 7777）。
- サーバーは最終状態を決定し、ゴースト同期で位置をブロードキャスト。
- 8人規模なら1台で十分。Tickrateは回線帯域と負荷を見て設定（例: 30–60 Hz）。

## 運用・デプロイ手順（例）
1) ローカルで headless サーバービルドを作成
2) S3に `build-bucket/gameserver/<version>/` としてアップロード
3) EC2起動時の user-data で S3 から最新ビルド取得 → systemd で起動
4) 変更時は AMI/launch template を更新し、ASG を rolling refresh（ASGを使わないなら手動再起動）

## 概算費用（24/7, 8人, ap-northeast-1, 2026/01時点の目安）
| サービス | 前提 | 月額目安 |
| --- | --- | --- |
| EC2 t3.small | オンデマンド 730h, $0.0208/h | 約 **$15.2** |
| EBS gp3 30GB | $0.08/GB | 約 **$2.4** |
| Elastic IP | アタッチ中は無料（未割当で ~$3.6/月） | $0 |
| データ転送アウト | 8人×20KB/s想定 ⇒ 約 414GB/月, $0.09/GB | 約 **$37.3** |
| S3 保管 | 10GB | 約 **$0.23** |
| S3 PUT/LIST等 | 少量 | 数十円未満 |
| CloudWatch Logs | 1GB 取り込み, 保管 1GB | 約 **$0.6** |
| Route53 | パブリックホストゾーン | **$0.5** + クエリ微小 |
| **合計目安** | 小計 | **$56〜60/月** 程度 |

※ データ転送量が支配的です。実測ビットレートが下がれば大きく減ります。

## 拡張/スケール案
- **NLB (UDP)** を前段に置き、複数EC2への分散を可能に（8人なら不要）。
- **ゲームサーバーのコンテナ化**: ECS Fargate (UDPはNLB必須) で運用簡素化。ただし小規模ではEC2より割高になりやすい。
- **マッチメイクや認証をクラウド化**: Amazon GameLift Realtime/Multiplayer、Cognito などを追加。現状はUnity Servicesを継続利用でOK。
- **監視強化**: CloudWatch Synthetics でポート疎通チェック、AWS WAF + Shield (NLB/ALB経由時)。

## 次のアクション
- セキュリティグループとポートポリシーを決める（UDP 7777 + 管理用SSH）。
- 試験用に t3.small 1台を立てて実測帯域を計測。必要に応じて t3.medium へ増強。
- ビルド配布の仕組み（S3 + user-data or simple CI）を決める。
