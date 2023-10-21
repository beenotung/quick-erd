package com.example.javaproject.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "`pet`")
public class PetEntity {
    @Id
    @GeneratedValue
    @Column(name = "`id`")
    private Long id;

    @Column(name = "`type`", nullable = false)
    private String type;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
