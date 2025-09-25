#!/bin/bash

# 服务器部署脚本
echo "开始部署接通分析V3项目..."

# 1. 克隆代码到服务器
echo "1. 克隆项目代码..."
cd /var/www/
sudo git clone https://github.com/tuodanZhong/follow-up-analysis-v3.git
cd follow-up-analysis-v3

# 2. 安装依赖
echo "2. 安装Node.js依赖..."
sudo npm install --production

# 3. 创建环境配置文件
echo "3. 创建环境配置..."
sudo cp config.js.example config.js
# 需要手动编辑config.js中的数据库配置

# 4. 设置文件权限
echo "4. 设置文件权限..."
sudo chown -R www-data:www-data /var/www/follow-up-analysis-v3
sudo chmod -R 755 /var/www/follow-up-analysis-v3

# 5. 启动服务
echo "5. 启动PM2服务..."
sudo pm2 start server.js --name "follow-up-analysis"
sudo pm2 save
sudo pm2 startup

echo "部署完成！"
echo "请配置Nginx反向代理指向 http://localhost:3000"