aws s3 cp s3://gungamestack-artifactsbucket2aac5544-fc12yqjrz1hi/LinuxServerArtifact.x86_64 .
aws s3 cp s3://gungamestack-artifactsbucket2aac5544-fc12yqjrz1hi/libdecor-0.so.0 .
aws s3 cp s3://gungamestack-artifactsbucket2aac5544-fc12yqjrz1hi/libdecor-cairo.so .
aws s3 cp s3://gungamestack-artifactsbucket2aac5544-fc12yqjrz1hi/UnityPlayer.so .
aws s3 cp s3://gungamestack-artifactsbucket2aac5544-fc12yqjrz1hi/LinuxServerArtifact_Data/ ./LinuxServerArtifact_Data --recursive

chmod +x LinuxServerArtifact.x86_64
./LinuxServerArtifact.x86_64 -port 7777 -logFile /var/log/gungame.log &
echo $! > gungame.pid
echo "GunGame server started with PID $(cat gungame.pid)"
