/*
 * Copyright 2012-2025 the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
package org.springframework.samples.petclinic.owner

import java.text.ParseException
import java.util.Locale
import org.springframework.format.Formatter
import org.springframework.stereotype.Component

@Component
class PetTypeFormatter(private val types: PetTypeRepository) : Formatter<PetType> {
    override fun print(petType: PetType, locale: Locale): String = petType.name ?: "<null>"

    @Throws(ParseException::class)
    override fun parse(text: String, locale: Locale): PetType {
        for (type in types.findPetTypes()) {
            if (type.name == text) {
                return type
            }
        }
        throw ParseException("type not found: $text", 0)
    }
}
