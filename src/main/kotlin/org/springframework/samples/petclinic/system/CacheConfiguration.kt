/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
package org.springframework.samples.petclinic.system

import org.springframework.boot.cache.autoconfigure.JCacheManagerCustomizer
import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.cache.configuration.MutableConfiguration

/** Cache configuration intended for caches providing the JCache API. */
@Configuration(proxyBeanMethods = false)
@EnableCaching
class CacheConfiguration {

    @Bean
    fun petclinicCacheConfigurationCustomizer(): JCacheManagerCustomizer =
        JCacheManagerCustomizer { cacheManager -> cacheManager.createCache("vets", cacheConfiguration()) }

    private fun cacheConfiguration(): javax.cache.configuration.Configuration<Any, Any> =
        MutableConfiguration<Any, Any>().setStatisticsEnabled(true)
}
