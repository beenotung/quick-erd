package com.example.javaproject.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "`user_pet`")
public class UserPetEntity {
    @Id
    @GeneratedValue
    @Column(name = "`id`")
    private Long id;

    @Column(name = "`user_id`", nullable = false)
    private Long userId;

    @Column(name = "`pet_id`", nullable = false)
    private Long petId;

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

    public Long getPetId() {
        return petId;
    }

    public void setPetId(Long petId) {
        this.petId = petId;
    }
}
