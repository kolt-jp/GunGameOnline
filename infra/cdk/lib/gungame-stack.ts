import {
  Stack,
  StackProps,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Tags,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface GunGameStackProps extends StackProps {
  /** UDPポート。デフォルト 7777 */
  gamePort?: number;
}

export class GunGameStack extends Stack {
  constructor(scope: Construct, id: string, props?: GunGameStackProps) {
    super(scope, id, props);

    const gamePort = props?.gamePort ?? 7777;

    // VPC: パブリックサブネット1つ、NATなし（最小コスト）
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // セキュリティグループ: UDPゲームポートとSSH(22)。SSHは必要に応じて絞ること。
    const sg = new ec2.SecurityGroup(this, 'GameSecurityGroup', {
      vpc,
      description: 'SecurityGroup for GunGame headless server',
      allowAllOutbound: true,
    });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(gamePort), 'Game UDP port');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH (tighten to your IP)');

    // EC2 IAM Role: SSM + S3 読み取り（ビルド取得用）
    const role = new iam.Role(this, 'GameServerRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'Allows EC2 to use SSM and read artifacts from S3',
    });
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'));

    // S3バケット（ビルド配置用）
    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // AMI: Amazon Linux 2 最新
    const ami = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    });

    // EC2インスタンス（t3.small）
    const instance = new ec2.Instance(this, 'GameServer', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: sg,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: ami,
      role,
      keyName: undefined, // SSMを使う前提。鍵を使うならここに設定。
    });

    // EIP割当
    const eip = new ec2.CfnEIP(this, 'GameServerEip', {
      domain: 'vpc',
    });
    new ec2.CfnEIPAssociation(this, 'GameServerEipAssociation', {
      allocationId: eip.attrAllocationId,
      instanceId: instance.instanceId,
    });

    // ユーザーデータ: OSアップデート + 依存 + S3からビルド取得の雛形
    instance.userData.addCommands(
      'yum update -y',
      'yum install -y awscli unzip',
      '# 例: aws s3 cp s3://' + artifactsBucket.bucketName + '/gameserver/latest.zip /opt/game.zip',
      '# 例: unzip -o /opt/game.zip -d /opt/game',
      '# 例: chmod +x /opt/game/ServerBinary',
      '# 例: /opt/game/ServerBinary -port ' + gamePort + ' -batchmode -nographics -logFile /var/log/gungame.log > /var/log/gungame-boot.log 2>&1 &'
    );

    // タグ
  Tags.of(instance).add('Name', 'GunGame-Headless');

    // 出力
    new CfnOutput(this, 'VpcId', { value: vpc.vpcId });
    new CfnOutput(this, 'SecurityGroupId', { value: sg.securityGroupId });
    new CfnOutput(this, 'ArtifactsBucketName', { value: artifactsBucket.bucketName });
    new CfnOutput(this, 'ElasticIp', { value: eip.ref });
  }
}
