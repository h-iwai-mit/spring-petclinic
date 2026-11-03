/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
package org.springframework.samples.petclinic.vet

import org.springframework.cache.annotation.Cacheable
import org.springframework.dao.DataAccessException
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.repository.Repository
import org.springframework.transaction.annotation.Transactional

/** Spring Data repository for [Vet] domain objects. */
interface VetRepository : Repository<Vet, Int> {

    @Transactional(readOnly = true)
    @Cacheable("vets")
    @Throws(DataAccessException::class)
    fun findAll(): Collection<Vet>

    @Transactional(readOnly = true)
    @Cacheable("vets")
    @Throws(DataAccessException::class)
    fun findAll(pageable: Pageable): Page<Vet>
}
