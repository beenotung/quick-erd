package com.example.javaproject.entity;

import lombok.Data;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Column;

@Entity
@Data
@Table(name = "`pet`")
public class PetEntity {
  @Id
  @GeneratedValue
  @Column
  private Long id;

  @Column(name = "`type`", nullable = false)
  private String type;
}
