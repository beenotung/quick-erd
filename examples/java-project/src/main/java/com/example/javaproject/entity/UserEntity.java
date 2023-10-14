package com.example.javaproject.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "`user`")
public class UserEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO)
  @Column
  private Long id;

  @Column(name = "`username`", nullable = false)
  private String username;

  @Column(name = "`password_hash`", nullable = false)
  private String passwordHash;
}
