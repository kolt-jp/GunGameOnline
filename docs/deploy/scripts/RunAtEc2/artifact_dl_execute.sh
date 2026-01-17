#!/bin/bash
aws s3 cp s3://gungamestack-artifactsbucket2aac5544-fc12yqjrz1hi/LinuxServerArtifact/ $HOME/game --recursive

chmod +x $HOME/game/LinuxServerArtifact.x86_64
$HOME/game/LinuxServerArtifact.x86_64 -port 7777 -logFile /var/log/gungame.log &
echo $! > $HOME/game/gungame.pid
echo "GunGame server started with PID $(cat $HOME/game/gungame.pid)"
