package com.example.javaproject.controller;

import com.example.javaproject.dto.CreatePetDTO;
import com.example.javaproject.entity.PetEntity;
import com.example.javaproject.service.PetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.repository.query.Param;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("pets")
public class PetController {
  @Autowired
  PetService petService;

  @PostMapping
  public PetEntity createPet(@RequestBody() CreatePetDTO createPetDTO) {
    return petService.createPet(createPetDTO);
  }

  @GetMapping("search")
  public PetEntity searchPets(@Param("type") String type) {
    return petService.findPetByType(type);
  }

  @GetMapping
  public Iterable<PetEntity> findAllPets() {
    return petService.findAllPets();
  }
}
