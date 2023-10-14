package com.example.javaproject.entity;

import lombok.Data;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Entity
@Data
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
}
