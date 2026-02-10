<template>
    <header class="header">
      <NuxtLink to="/" class="brand" aria-label="Subculture Ground 홈">
        <span class="brand__dot" aria-hidden="true" />
        <span class="brand__text">Subculture Ground</span>
      </NuxtLink>
  
      <nav class="nav" aria-label="주요 메뉴">
        <NuxtLink class="nav__link" to="/">홈</NuxtLink>
        <NuxtLink class="nav__link" to="/bookings/events">예매</NuxtLink>
        <NuxtLink class="nav__link" to="/about">소개</NuxtLink>
        <NuxtLink class="nav__link nav__link--login" to="/auth/login">로그인</NuxtLink>
      </nav>
    </header>
  </template>
  
  <style scoped>
  @import '~/assets/css/index.css';
  </style>
  
  