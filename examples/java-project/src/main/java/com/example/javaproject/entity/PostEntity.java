package com.example.javaproject.entity;

import lombok.Data;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Column;
import java.sql.Timestamp;
import java.sql.Date;
import java.sql.Time;

@Entity
@Data
@Table(name = "`post`")
public class PostEntity {
  @Id
  @GeneratedValue
  @Column
  private Long id;

  @Column(name = "`user_id`", nullable = false)
  private Long userId;

  @Column(name = "`title`", nullable = true)
  private String title;

  @Column(name = "`content`", nullable = false)
  private String content;

  @Column(name = "`post_at`", nullable = false)
  private Timestamp postAt;

  @Column(name = "`post_date`", nullable = false)
  private Date postDate;

  @Column(name = "`post_time`", nullable = false)
  private Time postTime;
}
