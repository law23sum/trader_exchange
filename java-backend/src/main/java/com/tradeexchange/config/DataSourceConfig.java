package com.tradeexchange.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import org.sqlite.SQLiteDataSource;

@Configuration
public class DataSourceConfig {

  @Value("${app.sqlite.path:../backend/trade.db}")
  private String sqlitePath;

  @Bean
  public DataSource dataSource(){
    SQLiteDataSource ds = new SQLiteDataSource();
    ds.setUrl("jdbc:sqlite:" + sqlitePath);
    return ds;
  }

  @Bean
  public JdbcTemplate jdbcTemplate(DataSource ds){
    return new JdbcTemplate(ds);
  }
}

