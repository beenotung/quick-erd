# start docker container

```shell
# knex client mysql2 supports MySQL 8+/9 caching_sha2_password
docker run -e MYSQL_ROOT_PASSWORD=Strong.Password -p 3306:3306 --name docker-mysql mysql
```

# attach sql shell

```shell
docker exec -it docker-mysql mysql -uroot -pStrong.Password
```

# create database in sql shell

```sql
CREATE DATABASE erd;

-- to select the database
USE erd;
```
