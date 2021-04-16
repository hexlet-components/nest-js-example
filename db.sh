sudo docker run --name local_pg \
    -e POSTGRES_ROOT_PASSWORD=toor \
    -e POSTGRES_DATABASE=test \
    -e POSTGRES_USER=test \
    -e POSTGRES_PASSWORD=test \
    -d -p 127.0.0.1:5435:5432 postgres:10.8-alpine