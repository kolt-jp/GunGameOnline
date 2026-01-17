# GunGame AWS CDK (minimal EC2 headless server)

このCDKスタックは最小コスト構成で次を作成します：
- VPC（1AZ, パブリックサブネット, NATなし）
- セキュリティグループ（UDP 7777, SSH 22）
- EC2 t3.small（Amazon Linux 2, SSM/S3 Read権限付き）
- Elastic IP（EC2に割り当て）
- S3バケット（ビルド成果物置き場・公開ブロック）

## 使い方
1. 依存インストール（初回）
   ```bash
   cd infra/cdk
   npm install
   ```
2. CDKブートストラップ（未実行なら）
   ```bash
   npm run cdk -- bootstrap
   ```
3. デプロイ
   ```bash
   npm run deploy
   ```

## ビルド取得の例（UserData内のコメントを実際のパスに置換）
- S3に `gameserver/latest.zip` などをアップロード
- UserDataを次のように変更
  ```bash
  aws s3 cp s3://<bucket-name>/gameserver/latest.zip /opt/game.zip
  unzip -o /opt/game.zip -d /opt/game
  chmod +x /opt/game/ServerBinary
  /opt/game/ServerBinary -port 7777 -batchmode -nographics -logFile /var/log/gungame.log \
    > /var/log/gungame-boot.log 2>&1 &
  ```

## 注意・運用Tips
- SSHは0.0.0.0/0開放のままなので、**デプロイ後に必ず自分のIPに絞るか、ポートを閉じてSSM接続に統一**してください。
- コスト最小のため NAT Gateway は作っていません。必要なら VPC設定を拡張してください。
- バケットは `RemovalPolicy.RETAIN` です。削除時に中身を残します。

## よく使うパラメータを変えたい場合
- ゲームポートを変える: `GameGameStack` の `gamePort` を props で渡す or デフォルト 7777 を変更
- インスタンスタイプ: `ec2.InstanceType.of` を変更
- AZ 数: `maxAzs` を変更
