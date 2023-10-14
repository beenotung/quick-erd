package com.example.javaproject.repository;

import com.example.javaproject.entity.UserPetEntity;
import org.springframework.data.repository.CrudRepository;

public interface UserPetRepository extends CrudRepository<UserPetEntity, Long> {
}
