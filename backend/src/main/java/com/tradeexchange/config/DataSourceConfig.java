package com.tradeexchange.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.sqlite.SQLiteDataSource;

@Configuration
public class DataSourceConfig {

  @Value("${app.sqlite.path:trade.db}")
  private String sqlitePath;

  @Bean
  public DataSource dataSource(){
    SQLiteDataSource ds = new SQLiteDataSource();
    String resolvedPath = resolveSqlitePath(sqlitePath);
    ds.setUrl("jdbc:sqlite:" + resolvedPath);
    return ds;
  }

  @Bean
  public JdbcTemplate jdbcTemplate(DataSource ds){
    return new JdbcTemplate(ds);
  }

  private String resolveSqlitePath(String configuredPath){
    String candidate = (configuredPath == null || configuredPath.isBlank()) ? "trade.db" : configuredPath;
    Path direct = Paths.get(candidate);
    if (direct.isAbsolute() && Files.exists(direct)){
      return direct.toString();
    }
    if (Files.exists(direct)){
      return direct.toAbsolutePath().toString();
    }

    Path cwd = Paths.get("").toAbsolutePath();
    Path backendLocal = cwd.resolve("backend").resolve(candidate).normalize();
    if (Files.exists(backendLocal)){
      return backendLocal.toString();
    }

    Path parent = cwd.getParent();
    if (parent != null){
      Path parentBackend = parent.resolve("backend").resolve(candidate).normalize();
      if (Files.exists(parentBackend)){
        return parentBackend.toString();
      }
    }

    return direct.toAbsolutePath().toString();
  }
}
