/*
 * Copyright 2012-2025 the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
package org.springframework.samples.petclinic.owner

import java.util.Optional
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository

interface OwnerRepository : JpaRepository<Owner, Int> {
    fun findByLastNameStartingWith(lastName: String, pageable: Pageable): Page<Owner>

    override fun findById(id: Int): Optional<Owner>
}
