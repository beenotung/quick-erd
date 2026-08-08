# start docker container

```shell
docker run -e POSTGRES_PASSWORD=Strong.Password -p 5432:5432 --name docker-pg postgres
```

# attach sql shell

```shell
docker exec -it docker-pg psql -U postgres
```

# create database in sql shell

```sql
CREATE DATABASE erd;

-- to select the database
\c erd
```

# .env for local docker (no SSL)

```env
DB_NAME=erd
DB_USERNAME=postgres
DB_PASSWORD=Strong.Password
DB_HOST=localhost
DB_PORT=5432
DB_CLIENT=pg
DB_SSL=false
```
