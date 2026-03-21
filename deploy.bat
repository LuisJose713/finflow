docker build -t finflow-frontend .
docker stop finflow-frontend 2>nul
docker rm finflow-frontend 2>nul
docker run -d -p 80:80 --name finflow-frontend finflow-frontend
echo Frontend listo en http://localhost