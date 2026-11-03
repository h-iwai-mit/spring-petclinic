/*
 * Copyright 2012-2025 the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
package org.springframework.samples.petclinic.owner

import org.springframework.util.StringUtils
import org.springframework.validation.Errors
import org.springframework.validation.Validator

open class PetValidator : Validator {
    open override fun validate(obj: Any, errors: Errors) {
        val pet = obj as Pet
        val name = pet.name
        if (!StringUtils.hasText(name)) {
            errors.rejectValue("name", REQUIRED, REQUIRED)
        } else if (name!!.length > MAX_NAME_LENGTH) {
            errors.rejectValue("name", "size", "Name must be no more than 30 characters")
        }

        if (pet.isNew() && pet.type == null) {
            errors.rejectValue("type", REQUIRED, REQUIRED)
        }
        if (pet.birthDate == null) {
            errors.rejectValue("birthDate", REQUIRED, REQUIRED)
        }
    }

    open override fun supports(clazz: Class<*>): Boolean = Pet::class.java.isAssignableFrom(clazz)

    private companion object {
        const val REQUIRED = "required"
        const val MAX_NAME_LENGTH = 30
    }
}
