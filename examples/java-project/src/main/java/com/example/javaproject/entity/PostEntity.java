package com.example.javaproject.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Column;
import java.sql.Timestamp;
import java.sql.Date;
import java.sql.Time;

@Entity
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

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public Timestamp getPostAt() {
    return postAt;
  }

  public void setPostAt(Timestamp postAt) {
    this.postAt = postAt;
  }

  public Date getPostDate() {
    return postDate;
  }

  public void setPostDate(Date postDate) {
    this.postDate = postDate;
  }

  public Time getPostTime() {
    return postTime;
  }

  public void setPostTime(Time postTime) {
    this.postTime = postTime;
  }
}
