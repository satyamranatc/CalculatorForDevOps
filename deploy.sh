echo "Pulling The New Code"
git pull

# Building The Code
npm install
npm run build
echo "Building Completed"


sudo cp -r ~/CalculatorForDevOps/dist/* /var/www/html/

echo "Deployment Completed"
