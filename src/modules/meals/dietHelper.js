const parseDietType = (dietType = "") => {
    const type = dietType.toLowerCase();
  
    return {
      isVeg: type.includes("veg"),
      isEgg: type.includes("egg"),
      isNonVeg: type.includes("non veg"),
    };
  };
  
  export default parseDietType;