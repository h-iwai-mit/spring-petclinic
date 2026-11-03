/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
package org.springframework.samples.petclinic.vet

import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.Table
import jakarta.xml.bind.annotation.XmlElement
import org.springframework.samples.petclinic.model.Person
import java.util.HashSet

/** Simple JavaBean domain object representing a veterinarian. */
@Entity
@Table(name = "vets")
open class Vet : Person() {

    @field:ManyToMany(fetch = FetchType.EAGER)
    @field:JoinTable(
        name = "vet_specialties",
        joinColumns = [JoinColumn(name = "vet_id")],
        inverseJoinColumns = [JoinColumn(name = "specialty_id")],
    )
    @get:JvmName("getSpecialtiesField")
    @set:JvmName("setSpecialtiesField")
    private var specialties: MutableSet<Specialty>? = null

    protected open fun getSpecialtiesInternal(): MutableSet<Specialty> {
        var current = specialties
        if (current == null) {
            current = HashSet()
            specialties = current
        }
        return current
    }

    @XmlElement
    open fun getSpecialties(): List<Specialty> = getSpecialtiesInternal().sortedWith(compareBy { it.name })

    open fun getNrOfSpecialties(): Int = getSpecialtiesInternal().size

    open fun addSpecialty(specialty: Specialty) {
        getSpecialtiesInternal().add(specialty)
    }
}
