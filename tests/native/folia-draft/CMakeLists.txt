cmake_minimum_required(VERSION 3.25)
project(FoliaDraftNativeTest LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_AUTOMOC ON)
find_package(Qt6 6.12 REQUIRED COMPONENTS Core Gui Qml Quick Concurrent Test)
if(NOT ECHO_HOST_SOURCE)
  message(FATAL_ERROR "ECHO_HOST_SOURCE must name the host source checkout")
endif()
get_filename_component(FOLIA_PLUGIN_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../.."
                       ABSOLUTE)
set(THEME_SOURCE "${ECHO_HOST_SOURCE}/modules/EchoMusic/Theme")
qt_add_executable(
  folia-draft-test ../folia-draft.cpp
  "${THEME_SOURCE}/AppearanceConfiguration.cpp"
  "${THEME_SOURCE}/AppearanceConfiguration.h")
target_include_directories(folia-draft-test PRIVATE "${THEME_SOURCE}")
target_compile_definitions(
  folia-draft-test PRIVATE FOLIA_DRAFT_PLUGIN_ROOT="${FOLIA_PLUGIN_ROOT}")
target_link_libraries(
  folia-draft-test PRIVATE Qt6::Core Qt6::Gui Qt6::Qml Qt6::Quick
                           Qt6::Concurrent Qt6::Test)
