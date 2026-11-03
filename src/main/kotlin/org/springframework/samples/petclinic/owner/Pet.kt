/*
 * Copyright 2012-2025 the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
package org.springframework.samples.petclinic.owner

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import java.time.LocalDate
import java.util.LinkedHashSet
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.samples.petclinic.model.NamedEntity

@Entity
@Table(name = "pets")
open class Pet : NamedEntity() {

    @field:Column
    @field:DateTimeFormat(pattern = "yyyy-MM-dd")
    open var birthDate: LocalDate? = null

    @field:ManyToOne
    @field:JoinColumn(name = "type_id")
    open var type: PetType? = null

    @field:OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.EAGER)
    @field:JoinColumn(name = "pet_id")
    @field:OrderBy("date ASC")
    private val visits: MutableSet<Visit> = LinkedHashSet()

    fun getVisits(): MutableCollection<Visit> = visits

    fun addVisit(visit: Visit) {
        visits.add(visit)
    }
}
