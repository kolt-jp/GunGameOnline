# SSH鍵の作成とEC2への登録手順

この手順で作成する鍵は、ローカルからEC2へビルド成果物をデプロイする際に `deploy_to_ec2.sh` が利用します。

## 1. 鍵を作成する
```bash
ssh-keygen -t ed25519 -f ~/.ssh/gungame-ec2 -C "gungame-deploy"
```
- パスフレーズは任意（設定推奨）。
- 生成物:
  - 秘密鍵: `~/.ssh/gungame-ec2`
  - 公開鍵: `~/.ssh/gungame-ec2.pub`

## 2. 公開鍵をEC2に登録する
EC2にSSHログインできる方法（既存鍵 or SSM経由）が必要です。ログイン後、以下を実行。
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat <<'EOF' >> ~/.ssh/authorized_keys
<ここに ~/.ssh/gungame-ec2.pub の中身を貼る>
EOF
chmod 600 ~/.ssh/authorized_keys
```

### 代替: `ssh-copy-id` を使う場合（Linux/macOS）
```bash
ssh-copy-id -i ~/.ssh/gungame-ec2.pub ec2-user@<EC2_PUBLIC_IP>
```

## 3. configを設定（任意）
`~/.ssh/config` にエントリを追加すると楽です。
```sshconfig
Host gungame-ec2
  HostName <EC2_PUBLIC_IP>
  User ec2-user
  IdentityFile ~/.ssh/gungame-ec2
  StrictHostKeyChecking accept-new
```

## 4. 接続確認
```bash
ssh -i ~/.ssh/gungame-ec2 ec2-user@<EC2_PUBLIC_IP>
```

## 5. デプロイスクリプトの使い方
```bash
# 例: IPを指定して実行
LinuxServerArtifact/scripts/deploy_to_ec2.sh <EC2_PUBLIC_IP>

# ユーザーや成果物パスを指定する場合
KEY_PATH=~/.ssh/gungame-ec2 \
LinuxServerArtifact/scripts/deploy_to_ec2.sh <EC2_PUBLIC_IP> ec2-user /path/to/Builds/LinuxServer
```
- デフォルトで `~/.ssh/gungame-ec2` を使用します。異なる鍵を使う場合は `KEY_PATH` 環境変数で上書きしてください。
- 成果物はリモートの `~/gungame-server/` に配置されます。
