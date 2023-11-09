# start docker container

```shell
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Strong.Password" -p 1433:1433 --name docker-mssql mcr.microsoft.com/mssql/server
```

# attach sql shell

```shell
docker exec -it docker-mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "Strong.Password"
```

# create database in sql shell

```sql
CREATE DATABASE erd ON (NAME = erd_dat,FILENAME = '/tmp/erddat.mdf',SIZE = 10,MAXSIZE = 50,FILEGROWTH = 5)
LOG ON (NAME = erd_log,FILENAME = '/tmp/erdlog.ldf',SIZE = 5 MB,MAXSIZE = 25 MB,FILEGROWTH = 5 MB);
GO

USE erd;
GO
```
