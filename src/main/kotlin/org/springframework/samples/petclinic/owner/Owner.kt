/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 */
package org.springframework.samples.petclinic.owner

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.core.style.ToStringCreator
import org.springframework.samples.petclinic.model.Person
import org.springframework.util.Assert

@Entity
@Table(name = "owners")
open class Owner : Person() {

    @field:Column
    @field:NotBlank
    @field:Size(max = 255)
    open var address: String? = null

    @field:Column
    @field:NotBlank
    @field:Size(max = 80)
    open var city: String? = null

    @field:Column
    @field:NotBlank
    @field:Pattern(regexp = "\\d{10}", message = "{telephone.invalid}")
    open var telephone: @NotBlank @Pattern(regexp = "\\d{10}", message = "{telephone.invalid}") String? = null

    @field:OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.EAGER)
    @field:JoinColumn(name = "owner_id")
    @field:OrderBy("name")
    private val pets: MutableList<Pet> = ArrayList()

    fun getPets(): MutableList<Pet> = pets

    fun addPet(pet: Pet?) {
        if (pet == null || pets.contains(pet)) {
            return
        }
        for (existingPet in pets) {
            if (!existingPet.isNew() && !pet.isNew() && existingPet.id == pet.id) {
                return
            }
        }
        pets.add(pet)
    }

    fun getPet(name: String?): Pet? = getPet(name, false)

    fun getPet(id: Int?): Pet? {
        for (pet in pets) {
            if (!pet.isNew() && pet.id == id) {
                return pet
            }
        }
        return null
    }

    fun getPet(name: String?, ignoreNew: Boolean): Pet? {
        for (pet in pets) {
            val candidate = pet.name
            if (candidate != null && candidate.equals(name, ignoreCase = true)) {
                if (!ignoreNew || !pet.isNew()) {
                    return pet
                }
            }
        }
        return null
    }

    override fun toString(): String =
        ToStringCreator(this)
            .append("id", id)
            .append("new", isNew())
            .append("lastName", lastName)
            .append("firstName", firstName)
            .append("address", address)
            .append("city", city)
            .append("telephone", telephone)
            .toString()

    fun addVisit(petId: Int?, visit: Visit?) {
        Assert.notNull(petId, "Pet identifier must not be null!")
        Assert.notNull(visit, "Visit must not be null!")
        val pet = getPet(petId)
        Assert.notNull(pet, "Invalid Pet identifier!")
        pet!!.addVisit(visit!!)
    }
}
