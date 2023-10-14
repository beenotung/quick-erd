package com.example.javaproject.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "`pet`")
public class PetEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO)
  @Column
  private Long id;

  @Column(name = "`type`", nullable = false)
  private String type;
}
