package org.springframework.samples.petclinic.system

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.LocaleResolver
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor
import org.springframework.web.servlet.i18n.SessionLocaleResolver
import java.util.Locale

/** Configures internationalization support for the application. */
@Configuration
class WebConfiguration : WebMvcConfigurer {

    @Bean
    fun localeResolver(): LocaleResolver = SessionLocaleResolver().apply {
        setDefaultLocale(Locale.ENGLISH)
    }

    @Bean
    fun localeChangeInterceptor(): LocaleChangeInterceptor = LocaleChangeInterceptor().apply {
        paramName = "lang"
    }

    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(localeChangeInterceptor())
    }
}
