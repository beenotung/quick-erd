package com.example.javaproject.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Entity
@Table(name = "`user`")
public class UserEntity {
  @Id
  @GeneratedValue
  @Column
  private Long id;

  @Column(name = "`username`", nullable = false)
  private String username;

  @Column(name = "`password_hash`", nullable = false)
  private String passwordHash;

  @Column(name = "`role`", nullable = false)
  @Enumerated(EnumType.STRING)
  private UserRole role;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public UserRole getRole() {
    return role;
  }

  public void setRole(UserRole role) {
    this.role = role;
  }
}
