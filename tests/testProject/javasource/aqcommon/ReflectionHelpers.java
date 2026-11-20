package aqcommon;

import com.mendix.core.Core;
import com.mendix.systemwideinterfaces.core.IMendixObject;
import com.mendix.systemwideinterfaces.core.meta.IMetaObject;
import mxmodelreflection.proxies.MxObjectType;

public class ReflectionHelpers {
    private ReflectionHelpers(){}

    public static Boolean ObjectIsSpecialisationOf(MxObjectType ObjectToCheck, String SuperObjectCompleteName){

        return ObjectIsSpecialisationOf(ObjectToCheck.getCompleteName(), SuperObjectCompleteName);
    }

    public static Boolean ObjectIsSpecialisationOf(IMendixObject ObjectToCheck, String SuperObjectCompleteName){

        return ObjectIsSpecialisationOf(ObjectToCheck.getType(), SuperObjectCompleteName);
    }

    public static Boolean ObjectIsSpecialisationOf(String ObjectToCheckCompleteName, String SuperObjectCompleteName){

        IMetaObject meta = Core.getMetaObject(ObjectToCheckCompleteName);

        boolean matchFound = false;
        IMetaObject superObjects[] = new IMetaObject[meta.getSuperObjects().size()];
        superObjects = meta.getSuperObjects().toArray(superObjects);
        for(IMetaObject superObject : superObjects){
            String superName = superObject.getName();
            if( SuperObjectCompleteName.equals(superName) ){
                matchFound = true;
                break;
            }
        }

        return matchFound;
    }
}
